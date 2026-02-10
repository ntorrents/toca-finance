import { SignIn } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function Home() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard", { replace: true });
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Nil Finance</h1>
        <p className="text-muted-foreground mt-2">Gestión financiera personal</p>
      </div>
      <SignIn
        routing="path"
        path="/"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
