import { File } from "./file";

export const KEY = File.sync.read("certs/base-key.pem");
export const CERT = File.sync.read("certs/base-cert.pem");
export default { key: KEY, cert: CERT };
