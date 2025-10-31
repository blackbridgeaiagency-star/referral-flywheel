declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any;
  }

  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
    [key: string]: any;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    [key: string]: any;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): any;

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): any;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };

  export default jwt;
}