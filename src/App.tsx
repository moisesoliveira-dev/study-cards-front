import { Redirect, Route, Switch } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import SubjectsPage from './modules/subjects/pages/SubjectsPage';
import SubjectDetailPage from './modules/topics/pages/SubjectDetailPage';
import TopicCardsPage from './modules/cards/pages/TopicCardsPage';
import StudyPage from './modules/study/pages/StudyPage';
import LoginPage from './modules/auth/pages/LoginPage';
import RegisterPage from './modules/auth/pages/RegisterPage';
import FlowsListPage from './modules/flows/pages/FlowsListPage';
import FlowEditorPage from './modules/flows/pages/FlowEditorPage';
import { AuthProvider, useAuth } from './modules/auth/context/AuthContext';
import { ThemeProvider } from './shared/theme/ThemeContext';
import { AppShell } from './shared/layout/AppShell';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/fonts.css';
import './theme/variables.css';

setupIonicReact({ mode: 'md' });

function AuthenticatedShell() {
  const { isAuthenticated, loading } = useAuth();

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

  return (
    <AppShell>
      <IonRouterOutlet>
        <Route exact path="/home" component={SubjectsPage} />
        <Route exact path="/subjects/:subjectId" component={SubjectDetailPage} />
        <Route exact path="/topics/:topicId" component={TopicCardsPage} />
        <Route exact path="/flows" component={FlowsListPage} />
        <Route path="/flows/:flowId" component={FlowEditorPage} />
        <Route exact path="/study/:topicId" component={StudyPage} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </AppShell>
  );
}

const App: React.FC = () => (
  <IonApp>
    <ThemeProvider>
      <AuthProvider>
        <IonReactRouter>
          <Switch>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/register" component={RegisterPage} />
            <Route path="/" component={AuthenticatedShell} />
          </Switch>
        </IonReactRouter>
      </AuthProvider>
    </ThemeProvider>
  </IonApp>
);

export default App;
