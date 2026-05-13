import LetisAuthLayout from './LetisAuthLayout';
import VerifyForm from '../authForms/VerifyForm';

const Verify = () => (
  <LetisAuthLayout
    mode="register"
    pageTitle="Verifying your account"
    pageDescription="Completing email verification."
    headline="Verifying..."
    accent=""
    supportingText=""
    formTitle=""
    formDescription=""
  >
    <VerifyForm />
  </LetisAuthLayout>
);

export default Verify;
