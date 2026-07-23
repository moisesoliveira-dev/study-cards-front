import { Redirect, Route } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { IonSpinner } from '@ionic/react';
import { AppShell } from '../../shared/layout/AppShell';

type Props = RouteProps & {
  shell?: boolean;
};

export function PrivateRoute({
  component: Component,
  shell = true,
  ...rest
}: Props) {
  const { isAuthenticated, loading } = useAuth();

  if (!Component) return null;

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) {
          return (
            <div className="sc-auth-shell">
              <IonSpinner name="crescent" />
            </div>
          );
        }
        if (!isAuthenticated) {
          return <Redirect to="/login" />;
        }
        const page = <Component {...props} />;
        return shell ? <AppShell>{page}</AppShell> : page;
      }}
    />
  );
}
