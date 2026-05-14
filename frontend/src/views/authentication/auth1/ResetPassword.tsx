import LetisAuthLayout from './LetisAuthLayout';
import AuthResetPassword from '../authForms/AuthResetPassword';

const ResetPassword = () => (
  <LetisAuthLayout
    mode="forgot"
    pageTitle="Reset Password — Letis POS"
    pageDescription="Set a new password for your Letis POS account"
    headline="New password."
    accent="Start fresh."
    supportingText="Choose a strong password that you haven't used before and regain access to your workspace."
    formTitle="Set new password"
    formDescription="Enter a new password for your account."
  >
    <AuthResetPassword />
  </LetisAuthLayout>
);

export default ResetPassword;
