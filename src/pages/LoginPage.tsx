import { SignIn } from "@clerk/clerk-react";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark">
      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-xl",
          },
        }}
      />
    </div>
  );
};

export default LoginPage;
