import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";

const LoginPage = () => {
    return (
        <AuthCard title="Sign In">
            <SignInForm />
        </AuthCard>
    );
};

export default LoginPage;
