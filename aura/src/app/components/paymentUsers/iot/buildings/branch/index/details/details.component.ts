import {
  Component,
  OnInit,
  HostListener,
  Output,
  EventEmitter,
  ElementRef,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PremiumSideComponent } from '../../../../../side/side.component';
import { BottomTabComponent } from '../../../../../../bottom-tab/bottom-tab.component';
import { PaymentUserService } from '../../../../../../../services/paymentUser/payment-user.service';
import { FiwareService } from '../../../../../../../services/fiware/fiware.service';
import { NgxGaugeModule } from 'ngx-gauge';
import { SocketService } from '../../../../../../../services/socket/socket.service';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

declare var CanvasJS: any;

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, PremiumSideComponent, MatIconModule, BottomTabComponent, NgxGaugeModule, FormsModule, MatFormFieldModule, MatInputModule,],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsDeviceComponent implements OnInit, AfterViewChecked {
  isLargeScreen: boolean = window.innerWidth > 1024;
  @Output() bodySizeChange = new EventEmitter<boolean>();
  isSidebarCollapsed = true;

  buildingName: string = '';
  branchName: string = '';
  branchId: string = '';
  entitiesWithAlerts: any[] = [];
  deviceName: string = '';

  variables: any[] = [];
  commands: any[] = [];

  @ViewChildren('chartContainer') chartContainers!: QueryList<ElementRef>;

  private chartsRendered = false;

  // NUEVO: Actuadores por tipo
  actuadores: {
    toggle: { label: string }[],
    analogo: any[],
    dial: any[],
    toggleText: any[]
  } = {
      toggle: [],
      analogo: [],
      dial: [],
      toggleText: []
    };
  pastelColor: string = '';
  constructor(
    private paymentUserService: PaymentUserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private fiwareService: FiwareService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe(params => {
      this.buildingName = params.get('buildingName') || '';
      this.branchName = params.get('branchName') || '';
      this.branchId = params.get('id') || '';
    });

    this.deviceName = this.router.url.split('/').pop() || '';

    const fiwareService = sessionStorage.getItem('fiware-service');
    const fiwareServicePath = sessionStorage.getItem('fiware-servicepath');

    if (fiwareService && fiwareServicePath) {
      this.socketService.entitiesWithAlerts$.subscribe((entities: any[]) => {
        this.entitiesWithAlerts = entities.filter(entity => entity.deviceName === this.deviceName);
        console.log("Entidad filtrada:", this.entitiesWithAlerts);

        if (this.entitiesWithAlerts.length > 0) {
          const entidad = this.entitiesWithAlerts[0];
          this.commands = entidad.commands || [];

          // ✅ Mapear actuadores dinámicamente y parsear si son strings
          if (entidad.commandTypes) {
            this.actuadores = {
              toggle: (entidad.commandTypes.toggle || []).map((item: any) =>
                typeof item === 'string' ? JSON.parse(item) : item
              ),
              analogo: entidad.commandTypes.analogo || [],
              dial: entidad.commandTypes.dial || [],
              toggleText: entidad.commandTypes.toggleText || []
            };
            console.log("Actuadores cargados:", this.actuadores);
          }

          // ✅ Cargar variables solo si hay
          if (Array.isArray(entidad.variables) && entidad.variables.length > 0) {
            this.loadHistoricalData(entidad.id);
          } else {
            console.warn("⚠️ La entidad no tiene variables. Se omite carga de historial.");
          }
        }
      });

      setTimeout(() => {
        if (!this.socketService.hasReceivedData()) {
          this.socketService.loadEntitiesFromAPI(fiwareService, fiwareServicePath, this.fiwareService);
        }
      }, 3000);
    } else {
      console.error('❌ No se encontraron fiwareService o fiwareServicePath en sessionStorage');
    }
    this.pastelColor = this.getRandomPastelColor();
  }

  ngAfterViewChecked(): void {
    if (this.variables.length > 0 &&
      this.chartContainers.length === this.variables.length &&
      !this.chartsRendered) {
      this.chartsRendered = true;
      this.renderCharts();
      this.cdr.detectChanges();
    }
  }

  loadHistoricalData(entityId: string) {
    this.fiwareService.getHistoricalData(entityId).subscribe(response => {
      console.log("Respuesta de datos históricos:", response);

      const parsedData: { [name: string]: any } = {};

      response.values.forEach((entry: any) => {
        if (Array.isArray(entry.value)) {
          entry.value.forEach((sensor: any) => {
            const key = sensor.name;
            if (!parsedData[key]) {
              parsedData[key] = {
                name: sensor.name,
                unit: sensor.unit,
                data: []
              };
            }
            parsedData[key].data.push({
              timestamp: new Date(entry.timestamp),
              value: sensor.value,
              unit: sensor.unit
            });
          });
        }
      });

      const mappedVariables = Object.values(parsedData)
        .map((sensor: any) => {
          const lastValue = sensor.data[sensor.data.length - 1]?.value;
          return {
            ...sensor,
            value: lastValue + ' ' + sensor.unit,
            alert: {
              name: "Fresco",
              color: "#1a5fb4",
              level: 1
            }
          };
        })
        .filter(sensor => !isNaN(parseFloat(sensor.value)));

      if (mappedVariables.length === 0) {
        console.warn("⚠️ No hay variables válidas con datos numéricos. No se carga historial.");
        return;
      }

      this.variables = mappedVariables;
      this.chartsRendered = false;
    });
  }

  renderCharts() {
    this.chartContainers.forEach((containerRef, index) => {
      const variable = this.variables[index];

      setTimeout(() => {
        const chart = new CanvasJS.Chart(containerRef.nativeElement, {
          animationEnabled: true,
          theme: "light2",
          title: {
            text: variable.name
          },
          axisX: {
            title: "Tiempo",
            valueFormatString: "HH:mm"
          },
          axisY: {
            title: `Valor (${variable.unit})`,
            includeZero: false
          },
          data: [{
            type: "spline",
            name: variable.name,
            showInLegend: false,
            toolTipContent: "{x}: {y} " + variable.unit,
            dataPoints: variable.data.map((item: { timestamp: Date; value: number }) => ({
              x: new Date(item.timestamp),
              y: item.value
            }))
          }]
        });
        chart.render();
      }, 100);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.isLargeScreen = window.innerWidth > 1024;
  }

  onSideNavToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  onBackClick() {
    this.router.navigate([`/premium/building/${this.buildingName}/level/${this.branchId}/branch/${this.branchName}`]);
  }

  onCreateClick() {
    this.router.navigate([`/premium/devices`]);
  }

  getNumericValue(value: string): number {
    return parseFloat(value) || 0;
  }

  getGaugeRange(variable: any): { min: number; max: number } {
    return {
      min: variable.minGauge ?? 0,
      max: variable.maxGauge ?? 100
    };
  }

  getGaugeThresholds(variable: any): any[] {
    return [
      {
        value: variable.minGauge ?? 0,
        color: variable.colorGauge || '#fff'
      },
      {
        value: variable.maxGauge ?? 100,
        color: variable.colorGauge || '#fff'
      }
    ];
  }

  getGaugeColor(variable: any): string {
    return variable.colorGauge || '#fff';
  }

  estadoActuador: boolean = false;
  valorAnalogico: number = 128;
  dialValue = 0;
  dialRotation = 0;
  valorTextoActuador: string = '';
  valorActual: string = 'Valor inicial';

  toggleActuador(): void {
    this.estadoActuador = !this.estadoActuador;
    console.log('Actuador encendido:', this.estadoActuador);
  }

  enviarValorAnalogico(valor: number): void {
    console.log('Valor analógico enviado:', valor);
  }

  changeDial() {
    this.dialValue = (this.dialValue + 1) % 6;
    this.dialRotation = this.dialValue * 60;
    console.log("Dial en posición:", this.dialValue === 0 ? 'OFF' : this.dialValue);
  }

  actualizarActuadorTexto(): void {
    this.valorActual = this.valorTextoActuador;
    console.log('Texto actualizado:', this.valorTextoActuador);
  }
  // Función que genera colores pastel
  getRandomPastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`; // Saturación alta, luminosidad alta → pastel
  }
  dialLevels = ['OFF', '1', '2', '3', '4', '5'];
  selectedDial = 'OFF';

  selectDial(level: string) {
    this.selectedDial = level;
    console.log("dial seleccionado: ", this.selectedDial)
  }

  // Genera ángulos equidistantes en el círculo
  getDialPosition(index: number, total: number): string {
    const angle = (360 / total) * index - 90; // -90 para empezar desde arriba
    const radius = 80; // radio del círculo
    const x = radius * Math.cos(angle * (Math.PI / 180));
    const y = radius * Math.sin(angle * (Math.PI / 180));
    return `translate(${x}px, ${y}px)`;
  }

}
