


export enum DeviceType {
  XIAOZHI = 'xiaozhi',  
  OTHER = 'other',      
}


export enum DeviceStatus {
  ONLINE = 'online',     
  OFFLINE = 'offline',   
  UNKNOWN = 'unknown',   
}


export enum DeviceMessageType {
  COMMAND = 'command',  
  STATUS = 'status',    
  EVENT = 'event',      
  ERROR = 'error',      
}


export enum DeviceMessageDirection {
  TO_DEVICE = 'to_device',    
  FROM_DEVICE = 'from_device', 
}


export interface Device {
  id: string;              
  deviceId: string;        
  type: DeviceType;         
  name: string;            
  description?: string;     
  status: DeviceStatus;     
  ipAddress?: string;       
  macAddress?: string;      
  metadata?: any;           
  userId?: string;          
  createdAt: Date;          
  updatedAt: Date;          
}


export interface DeviceMessage extends Record<string, unknown> {
  id: string;                  
  deviceId: string;             
  type: DeviceMessageType;       
  direction: DeviceMessageDirection; 
  payload: any;                 
  topic?: string;               
  processed: boolean;           
  error?: string;               
  createdAt: Date;              
}


export interface DeviceCommand {
  action: string;              
  params?: any;                 
}


export interface DeviceFilter {
  type?: DeviceType;             
  status?: DeviceStatus;         
  keyword?: string;              
}
