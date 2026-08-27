// Covered by: `e2e/auth.e2e.spec.ts`
import { AuthCard } from "@/features/auth/components/auth-card/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form/sign-in-form";

const LoginPage = () => {
    return (
        <AuthCard title="Sign In">
            <SignInForm />
        </AuthCard>
    );
};

export default LoginPage;
