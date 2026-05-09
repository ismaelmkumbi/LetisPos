import LetisAuthLayout from './LetisAuthLayout';
import AuthForgotPassword from '../authForms/AuthForgotPassword';

const ForgotPassword = () => (
  <LetisAuthLayout
    mode="forgot"
    pageTitle="Forgot Password — Letis POS"
    pageDescription="Reset your Letis POS password"
    headline="Recover access."
    accent="Keep moving."
    supportingText="Request a secure reset link and return to your sales desk, inventory, reports, and team workspace without friction."
    formTitle="Forgot your password?"
    formDescription="Enter your email and we will send a reset link."
  >
    <AuthForgotPassword />
  </LetisAuthLayout>
);

export default ForgotPassword;
