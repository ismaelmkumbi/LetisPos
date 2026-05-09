import LetisAuthLayout from './LetisAuthLayout';
import AuthRegister from '../authForms/AuthRegister';

const Register = () => (
  <LetisAuthLayout
    mode="register"
    pageTitle="Create Letis POS workspace"
    pageDescription="Create a Letis POS workspace"
    headline="Launch your POS."
    accent="Stay organized."
    supportingText="Create a secure tenant for your business, then invite staff and start tracking every sale, product, and branch from day one."
    formTitle="Create workspace"
    formDescription="Business details first, admin account next."
  >
    <AuthRegister />
  </LetisAuthLayout>
);

export default Register;
