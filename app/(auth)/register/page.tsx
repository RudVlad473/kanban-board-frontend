import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

const RegisterPage = () => {
    return (
        <AuthCard title="Sign Up">
            <SignUpForm />
        </AuthCard>
    );
};

export default RegisterPage;
