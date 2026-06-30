/** True when GPS and DeviceOrientation APIs are available (HTTPS or localhost). */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}
