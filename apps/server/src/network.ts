import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import { isIPv4 } from "node:net";

export function networkAddress(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
  configuredAddress: string | undefined = process.env.CATCH_LAN_IP,
): string | null {
  if (configuredAddress !== undefined) {
    if (!isIPv4(configuredAddress) || configuredAddress.startsWith("127.") || configuredAddress === "0.0.0.0") {
      throw new Error("CATCH_LAN_IP deve ser um IPv4 de rede válido.");
    }
    return configuredAddress;
  }
  const entries = Object.entries(interfaces).sort(([a], [b]) =>
    Number(/^(docker|br-|veth|virbr|tun|tap|wg)/.test(a))
    - Number(/^(docker|br-|veth|virbr|tun|tap|wg)/.test(b)));
  for (const [, addresses] of entries) {
    const address = addresses?.find((entry: NetworkInterfaceInfo) =>
      entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("127."));
    if (address) return address.address;
  }
  return null;
}
