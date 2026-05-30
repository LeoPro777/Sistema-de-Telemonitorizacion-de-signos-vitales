/**
 * vitalsSocket.ts — Utilidad para gestionar conexiones WebSocket en tiempo real
 * para telemetría de signos vitales (Paciente y Expediente Médico).
 * Soporta auto-reconexión con retroceso y registro de callbacks.
 */

type VitalsCallback = (data: any) => void;

class VitalsSocketService {
  private socket: WebSocket | null = null;
  private patientId: string | null = null;
  private onMessageCallback: VitalsCallback | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectInterval = 3000; // Intentar reconectar cada 3 segundos
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  public connect(
    patientId: string,
    callbacks: {
      onMessage: VitalsCallback;
      onConnect?: () => void;
      onDisconnect?: () => void;
    }
  ) {
    this.patientId = patientId;
    this.onMessageCallback = callbacks.onMessage;
    this.onConnectCallback = callbacks.onConnect || null;
    this.onDisconnectCallback = callbacks.onDisconnect || null;
    this.reconnectAttempts = 0;

    this.establishConnection();
  }

  private establishConnection() {
    if (!this.patientId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Determinar dirección base
    const baseHost = (import.meta as any).env.VITE_WS_BASE_URL 
      ? (import.meta as any).env.VITE_WS_BASE_URL.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')
      : 'localhost:8000';
      
    const socketUrl = `${wsProtocol}//${baseHost}/ws/vitals/${this.patientId}`;
    console.log(`Abriendo canal de telemetría por WebSocket: ${socketUrl}`);

    try {
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        console.log(`WebSocket conectado exitosamente al paciente: ${this.patientId}`);
        this.reconnectAttempts = 0;
        if (this.onConnectCallback) {
          this.onConnectCallback();
        }
      };

      this.socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        
        try {
          const payload = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(payload);
          }
        } catch (err) {
          console.error('Error al decodificar mensaje WebSocket:', err);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Error detectado en el WebSocket de signos vitales:', error);
      };

      this.socket.onclose = () => {
        console.warn('Conexión del WebSocket cerrada.');
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
        this.attemptReconnect();
      };
    } catch (err) {
      console.error('Fallo al inicializar WebSocket:', err);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Límite máximo de intentos de reconexión alcanzado.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Intentando reconectar WebSocket en ${this.reconnectInterval / 1000}s (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.establishConnection();
    }, this.reconnectInterval);
  }

  public disconnect() {
    console.log('Cerrando canal de telemetría de forma manual...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.patientId = null;
    this.onMessageCallback = null;
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public send(message: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }
}

export const vitalsSocket = new VitalsSocketService();
export default vitalsSocket;
