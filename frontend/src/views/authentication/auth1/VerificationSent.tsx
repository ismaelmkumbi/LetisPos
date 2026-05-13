import LetisAuthLayout from './LetisAuthLayout';
import VerificationSentForm from '../authForms/VerificationSentForm';

const VerificationSent = () => (
  <LetisAuthLayout
    mode="register"
    pageTitle="Verify your account"
    pageDescription="Complete your registration by verifying your contact method."
    headline="Check your inbox."
    accent="Almost there."
    supportingText="Verify your email or phone to activate your account and start using SmartPOS."
    formTitle="Verify account"
    formDescription=""
  >
    <VerificationSentForm />
  </LetisAuthLayout>
);

export default VerificationSent;
