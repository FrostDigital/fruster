declare namespace frusterLog {
  export function silly(...args: any[]);
  export function debug(...args: any[]);
  export function info(...args: any[]);
  export function warn(...args: any[]);
  export function error(...args: any[]);
  export function remote(...args: any[]);
  export function audit(userId: string, msg: string, payload?: any);
}

export = frusterLog;
