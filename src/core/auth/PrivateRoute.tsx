import { Redirect, Route } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { IonSpinner } from '@ionic/react';

export function PrivateRoute({ component: Component, ...rest }: RouteProps) {
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
        return <Component {...props} />;
      }}
    />
  );
}
