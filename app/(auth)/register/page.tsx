// Covered by: `e2e/auth.e2e.spec.ts`
import { AuthCard } from "@/features/auth/components/auth-card/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form/sign-up-form";

const RegisterPage = () => {
    return (
        <AuthCard title="Sign Up">
            <SignUpForm />
        </AuthCard>
    );
};

export default RegisterPage;
