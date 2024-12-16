import { User } from "../models/users.models.js";
import { Role } from "../models/role.models.js";
import  bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import jwt from 'jsonwebtoken';

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("roleId"); // Popular información del rol
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener usuario por ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("roleId"); // Popular información del rol
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo usuario
export const createUser = async (req, res) => {
  const { nombre, correo, usuario, roleId } = req.body;

  try {
    // Verificar si el roleId proporcionado existe
    const role = await Role.findById(roleId);
    if (!role) return res.status(400).json({ message: "El roleId proporcionado no es válido" });

    // Generar contraseña aleatoria
    const randomPassword = crypto.randomBytes(8).toString("hex");

    // Encriptar la contraseña generada
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // Crear el usuario con la referencia al roleId
    const user = new User({
      nombre,
      correo,
      usuario,
      contrasena: hashedPassword,
      roleId,
    });

    // Guardar el usuario en la base de datos
    const newUser = await user.save();

    // Configurar y enviar correo de notificación
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
      text: `Hola ${nombre},\n\nTu cuenta ha sido creada exitosamente.\n\nDetalles de acceso:\nUsuario: ${usuario}\nContraseña: ${randomPassword}\n\nPor favor, cambia tu contraseña después de iniciar sesión.\n\nSaludos,\nEl equipo`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Usuario creado exitosamente", user: newUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un usuario
export const updateUser = async (req, res) => {
  const { roleId } = req.body;

  try {
    // Verificar si se proporciona roleId y si es válido
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ message: "El roleId proporcionado no es válido" });
    }

    // Actualizar el usuario
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Retorna el documento actualizado
    }).populate("roleId"); // Popular información del rol actualizado

    if (!updatedUser) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Usuario actualizado exitosamente", user: updatedUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un usuario
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { identifier, contrasena } = req.body;

  try {
    // Buscar usuario por correo o nombre de usuario
    const user = await User.findOne({
      $or: [{ correo: identifier }, { usuario: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Comparar contraseña
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user._id,
        nombre: user.nombre,
        correo: user.correo,
        usuario: user.usuario,
      },
      process.env.JWT_SECRET, // Clave secreta desde variables de entorno
      { expiresIn: '1h' } // Duración del token
    );

    // Enviar respuesta con el token
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        correo: user.correo,
        usuario: user.usuario,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
