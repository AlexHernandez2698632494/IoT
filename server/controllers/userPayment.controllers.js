import crypto from 'crypto'; // Para generar una contraseña aleatoria
import nodemailer from 'nodemailer'; // Para enviar correos
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserPayment } from "../models/userPayment.models.js";  // Cambio: Renombrado a PaymentUser
import { Email } from "../models/emails.models.js";
import { RegistrationKey } from "../models/registrationKey.models.js";
import { Authority } from '../models/authorities.models.js';
import { History } from '../models/history.models.js';

const ENCRYPTION_KEY = process.env.JWT_SECRET; // Debe ser de 32 bytes
const IV_LENGTH = 16; // Longitud del IV para AES

// Función para cifrar una clave
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// Función para descifrar una clave
const decrypt = (text) => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts[0], "hex");
  const encryptedText = Buffer.from(textParts[1], "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export const createFirstUserPayment = async (req, res) => {
  try {
    const { nombre, apellido, usuario, correo, registrationKey } = req.body;

    // Buscar o crear el email
    let emailDoc = await Email.findOne({ correo });
    if (!emailDoc) {
      emailDoc = await Email.create({ correo });
    }

    // Buscar la llave de registro
    const registrationKeyDoc = await RegistrationKey.findOne({ correo: emailDoc._id });
    if (!registrationKeyDoc) {
      return res.status(400).json({ message: "Clave de registro no válida" });
    }

    // Descifrar la clave almacenada y compararla con la ingresada
    const decryptedKey = decrypt(registrationKeyDoc.key);
    if (registrationKey !== decryptedKey) {
      return res.status(400).json({ message: "Clave de registro incorrecta" });
    }

    // Generar contraseña aleatoria
    const rawPassword = crypto.randomBytes(8).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(rawPassword, salt); // Aquí usamos rawPassword en lugar de randomPassword

    // Crear usuario
    const newUser = new UserPayment({
      nombre,
      apellido,
      usuario,
      correo: emailDoc._id,
      contrasena: encryptedPassword,
      registrationKey: registrationKeyDoc._id,
    });

    // Registrar en historial
    const historyEntry = new History({
      username: usuario,
      action: "Creación de usuario",
      datetime: new Date().toISOString(),
      nivel: 1,
    });

    // Guardar ambos documentos solo si no hay errores
    await newUser.save();
    await historyEntry.save();

    // Obtener la autoridad de la registrationKey
    const authoritiesDoc = await Authority.findById(registrationKeyDoc.authorities);

    // Enviar correo de notificación al nuevo usuario
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: correo,
      subject: "Registro exitoso",
      text: `Hola ${nombre} ${apellido},\n\nTu cuenta ha sido creada exitosamente.\nUsuario: ${usuario}\nContraseña: ${rawPassword}\n\nPor favor, cambia tu contraseña después de iniciar sesión.\nSaludos, El equipo.`,
    };

    await transporter.sendMail(mailOptions);

    // Responder con los datos del usuario y su autoridad
    return res.status(201).json({
      message: "Usuario creado exitosamente",
      user: {
        id: newUser._id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        correo: emailDoc.correo,
        usuario: newUser.usuario,
        contrasena: encryptedPassword, // Contraseña sin cifrar para que el usuario la vea
        registrationKey: decryptedKey, // La clave de registro descifrada
        authoritiesType: authoritiesDoc ? authoritiesDoc.type : null, // Tipo de autoridad
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// Obtener todos los usuarios de pago
export const getPaymentUsers = async (req, res) => {
  try {
    // Buscar los usuarios con estadoEliminacion = 0
    const users = await UserPayment.find({ estadoEliminacion: 0 })
      .populate('correo registrationKey'); // Poblamos las colecciones de correo y registrationKey

    // Si no se encuentran usuarios, devolver mensaje
    if (users.length === 0) {
      return res.status(404).json({ message: "No se encontraron usuarios activos" });
    }

    // Formatear y devolver los usuarios
    const usersData = await Promise.all(users.map(async (user) => {
      // Obtener los documentos relacionados
      const emailDoc = await Email.findById(user.correo);
      const registrationKeyDoc = await RegistrationKey.findById(user.registrationKey);
      const decryptedKey = decrypt(registrationKeyDoc.key);
      const authoritiesDoc = await Authority.findById(registrationKeyDoc.authorities);

      return {
        userID:user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        correo: emailDoc ? emailDoc.correo : null,
        contrasena:user.contrasena,
        registrationKey: decryptedKey,
        authoritiesType: authoritiesDoc ? authoritiesDoc.type : null,
      };
    }));

    return res.status(200).json(usersData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// Obtener un usuario de pago por ID
export const getPaymentUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar un solo usuario con estadoEliminacion = 0
    const user = await UserPayment.findOne({ _id: id, estadoEliminacion: 0 })
      .populate('correo registrationKey');

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado o eliminado" });
    }

    // Obtener los documentos necesarios: correo, clave de registro y autoridad
    const emailDoc = await Email.findById(user.correo);
    const registrationKeyDoc = await RegistrationKey.findById(user.registrationKey);
    const decryptedKey = decrypt(registrationKeyDoc.key);
    const authoritiesDoc = await Authority.findById(registrationKeyDoc.authorities);

    // Devolver la respuesta con los datos del usuario
    const transformedData = {
      userID:user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      usuario: user.usuario,
      correo: emailDoc ? emailDoc.correo : null,
      registrationKey: decryptedKey,
      authoritiesType: authoritiesDoc ? authoritiesDoc.type : null,
    };

    return res.status(200).json(transformedData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// Actualizar un usuario de pago (incluye actualizar el correo)
export const updatePaymentUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, usuario, correo } = req.body;

    // Buscar el usuario por ID
    const user = await UserPayment.findById(id).populate('correo registrationKey');
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar los campos que se permiten
    user.nombre = nombre || user.nombre;
    user.apellido = apellido || user.apellido;
    user.usuario = usuario || user.usuario;

    // Si se proporciona un nuevo correo, se actualiza
    if (correo) {
      // Eliminar el correo anterior
      await Email.findByIdAndDelete(user.correo); // Borrar el correo anterior

      // Crear el nuevo correo y asociarlo
      const newEmail = await Email.create({ correo });
      user.correo = newEmail._id; // Asignar el nuevo correo al usuario
    }

    // Guardar los cambios del usuario
    await user.save();

    // Obtener los documentos necesarios: correo, clave de registro y autoridad
    const updatedEmailDoc = await Email.findById(user.correo);
    const registrationKeyDoc = await RegistrationKey.findById(user.registrationKey);
    const decryptedKey = decrypt(registrationKeyDoc.key);

    // Obtener la autoridad del registro
    const authoritiesDoc = await Authority.findById(registrationKeyDoc.authorities);

    // Devolver la respuesta con todos los datos actualizados
    return res.status(200).json({
      message: "Usuario actualizado exitosamente",
      updatedUser: {
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        correo: updatedEmailDoc ? updatedEmailDoc.correo : null,
        registrationKey: decryptedKey,
        authoritiesType: authoritiesDoc ? authoritiesDoc.type : null, // Tipo de autoridad
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// Eliminar un usuario de pago (soft delete)
export const deletePaymentUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el usuario por ID
    const user = await UserPayment.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si ya está eliminado
    if (user.estadoEliminacion === 1) {
      return res.status(400).json({ message: "El usuario ya está eliminado" });
    }

    // Cambiar el estado de eliminación a 1
    user.estadoEliminacion = 1;
    await user.save();

    return res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// Restaurar un usuario de pago (cambiar el estado de eliminación de 1 a 0)
export const restorePaymentUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el usuario por ID
    const user = await UserPayment.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si ya está restaurado
    if (user.estadoEliminacion === 0) {
      return res.status(400).json({ message: "El usuario ya está restaurado" });
    }

    // Cambiar el estado de eliminación a 0 (restaurado)
    user.estadoEliminacion = 0;
    await user.save();

    return res.status(200).json({ message: "Usuario restaurado exitosamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

export const loginPaymentUser = async (req, res) => {
  try {
    const { identifier, contrasena } = req.body;

    if (!identifier || !contrasena) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // Buscar usuario por correo o nombre de usuario (identifier)
    let user;
    if (identifier.includes('@')) {
      // Si el identifier contiene un '@', se trata de un correo
      user = await UserPayment.findOne({ correo: identifier })
        .populate('correo')         // Poblamos la referencia al correo
        .populate('registrationKey') // Poblamos la referencia al registrationKey
        .populate({
          path: 'registrationKey', // Populamos 'registrationKey'
          populate: {
            path: 'authorities',   // Populamos 'authorities' dentro de registrationKey
          },
        });
    } else {
      // Si no contiene '@', se trata de un nombre de usuario
      user = await UserPayment.findOne({ usuario: identifier })
        .populate('correo')         // Poblamos la referencia al correo
        .populate('registrationKey') // Poblamos la referencia al registrationKey
        .populate({
          path: 'registrationKey', // Populamos 'registrationKey'
          populate: {
            path: 'authorities',   // Populamos 'authorities' dentro de registrationKey
          },
        });
    }

    // Si no existe el usuario
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que la contraseña proporcionada coincida
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Generar un token JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h', // El token expirará en 1 hora
    });

    // Si hay autoridades, devolver solo dos valores: name y type
    let authorities = [];
    if (user.registrationKey?.authorities) {
      // Obtenemos las autoridades y solo devolvemos 'name' y 'type'
      authorities = user.registrationKey.authorities.map(auth => {
        return [auth.name, auth.type]; // Crearemos un array de dos elementos
      }).flat(); // Aplanamos el array para que no haya sub-arrays
    }

    // Preparar la respuesta con todos los datos del usuario, incluyendo los datos relacionados
    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        correo: user.correo ? user.correo.correo : null, // Detalles completos del correo
        contrasena: user.contrasena, // Aunque se devuelve la contraseña cifrada (no recomendado)
        registrationKey: user.registrationKey ? user.registrationKey.key : null, // La clave de registro
        authorities, // Ahora las autoridades son un array con 'name' y 'type' en el orden que mencionas
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


export const resetPasswordPaymentUser = async (req, res) => {
    try {
      const { usuario } = req.body; // Solo recibimos el 'usuario'
  
      // Verificar que el usuario haya proporcionado un nombre de usuario
      if (!usuario) {
        return res.status(400).json({ message: 'Debe proporcionar un nombre de usuario' });
      }
  
      // Buscar el usuario por nombre de usuario
      const user = await UserPayment.findOne({ usuario }).populate('correo');
  
      // Si no se encuentra el usuario
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      // Generar una nueva contraseña aleatoria
      const newPassword = crypto.randomBytes(8).toString('hex');
      
      // Cifrar la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Actualizar la contraseña en la base de datos
      user.contrasena = hashedPassword;
      await user.save();
  
      // Obtener el correo del usuario
      const emailDoc = await Email.findById(user.correo);
  
      // Enviar correo con la nueva contraseña
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: emailDoc.correo,
        subject: 'Restablecimiento de contraseña',
        text: `Hola ${user.nombre},\n\nTu contraseña ha sido restablecida exitosamente.\n\nNueva Contraseña: ${newPassword}\n\nPor favor, inicia sesión con tu nueva contraseña.\nSaludos, El equipo.`,
      };
  
      await transporter.sendMail(mailOptions);
  
      // Responder con éxito
      return res.status(200).json({ message: 'Contraseña restablecida y enviada por correo' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  };

// Controlador para obtener información basada en el nombre de usuario
export const getUserPaymentInfo = async (req, res) => {
 try {
      const { username } = req.params;
  
      // Buscar el usuario en UserPayment
      const user = await UserPayment.findOne({ usuario: username }).populate('registrationKey').populate('correo');
      
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      const registrationKey = user.registrationKey;
  
      // Obtener la información de la RegistrationKey
      const regKeyDetails = await RegistrationKey.findById(registrationKey._id);
  
      if (!regKeyDetails) {
        return res.status(404).json({ message: 'RegistrationKey no encontrado' });
      }
  
      // Descifrar la clave (key) usando la función decrypt
      const decryptedKey = decrypt(regKeyDetails.key);
  
      // Contar cuántos usuarios tienen este registrationKey
      const userCount = await UserPayment.countDocuments({ registrationKey: registrationKey._id });
  
      // Obtener la información de todos los usuarios que tienen la misma registrationKey
      const usersWithSameKey = await UserPayment.find({ registrationKey: registrationKey._id })
        .select('nombre apellido correo')  // Solo seleccionamos los campos necesarios
        .populate('correo', 'email');  // Asumimos que "correo" es un documento con un campo "email"
  
      // Preparar la respuesta
      const response = {
        registrationKey: registrationKey._id,
        key: decryptedKey,  // La clave ahora está descifrada
        expiresAt: regKeyDetails.expiresAt,
        planType: regKeyDetails.planType,
        duration: regKeyDetails.duration,
        isExpired: regKeyDetails.isExpired,
        userCount,
        users: usersWithSameKey,  // Incluimos la información de todos los usuarios
      };
  
      return res.status(200).json(response);
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  };