import { describe, expect, it } from "vitest";
import type { NetworkInterfaceInfo } from "node:os";
import { networkAddress } from "./network";

function entry(address: string, internal = false): NetworkInterfaceInfo {
  return { address, internal, family: "IPv4", netmask: "255.255.255.0",
    mac: "00:00:00:00:00:00", cidr: `${address}/24` };
}

describe("endereço para QR codes", () => {
  it("ignora loopback e prioriza rede física em vez de docker", () => {
    expect(networkAddress({
      lo: [entry("127.0.0.1", true)],
      docker0: [entry("172.17.0.1")],
      wlan0: [entry("192.168.1.20")],
    }, undefined)).toBe("192.168.1.20");
  });
  it("usa o IP Wi-Fi configurado em vez da rede virtual do container", () => {
    expect(networkAddress({ eth0: [entry("172.19.60.97")] }, "192.168.68.108")).toBe("192.168.68.108");
    expect(() => networkAddress({}, "127.0.0.1")).toThrow("CATCH_LAN_IP");
    expect(() => networkAddress({}, "invalido")).toThrow("CATCH_LAN_IP");
  });
  it("não usa localhost como fallback quando não existe rede", () => {
    expect(networkAddress({ lo: [entry("127.0.0.1", true)] })).toBeNull();
    expect(networkAddress({})).toBeNull();
  });
});
