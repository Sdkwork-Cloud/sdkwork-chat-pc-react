


export type TerminalSessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';


export interface TerminalSession {
  
  id: string;
  
  
  name: string;
  
  
  shell: string;
  
  
  cwd: string;
  
  
  status: TerminalSessionStatus;
  
  
  createdAt: number;
  
  
  lastActivityAt: number;
  
  
  isPrimary: boolean;
}


export function createTerminalSession(
  id: string,
  name: string,
  shell: string = 'bash',
  cwd: string = '~'
): TerminalSession {
  const now = Date.now();
  return {
    id,
    name,
    shell,
    cwd,
    status: 'connecting',
    createdAt: now,
    lastActivityAt: now,
    isPrimary: false,
  };
}


export function updateTerminalSessionStatus(
  session: TerminalSession,
  status: TerminalSessionStatus
): TerminalSession {
  return {
    ...session,
    status,
    lastActivityAt: Date.now(),
  };
}


export function updateTerminalSessionCwd(
  session: TerminalSession,
  cwd: string
): TerminalSession {
  return {
    ...session,
    cwd,
    lastActivityAt: Date.now(),
  };
}

export default TerminalSession;
