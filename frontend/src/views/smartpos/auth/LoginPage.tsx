import React from 'react';

import LetisAuthLayout from 'src/views/authentication/auth1/LetisAuthLayout';
import AuthLoginForm from './AuthLoginForm';

const LoginPage: React.FC = () => (
  <LetisAuthLayout
    mode="login"
    pageTitle="Letis POS — Sign in"
    pageDescription="Sign in to your Letis POS workspace"
    headline="Smarter POS."
    accent="Stronger business."
    supportingText="Manage sales, inventory, customers, and finances with a fast AI-powered workspace built for growing retail teams."
    formTitle="Welcome back"
    formDescription="Sign in to your Letis POS account"
  >
    <AuthLoginForm />
  </LetisAuthLayout>
);

export default LoginPage;
