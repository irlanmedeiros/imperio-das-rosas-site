import Image from "next/image";
import { FormLogin } from "./form-login";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  return (
    <div className="login">
      <div className="login-foto">
        <Image src="/img/ocasiao-namorados.jpg" alt="" fill priority sizes="50vw" />
      </div>
      <FormLogin de={de ?? ""} />
    </div>
  );
}
