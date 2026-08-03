import { Redirect, Route, Switch } from 'react-router-dom';
import { IonApp, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import SubjectsPage from './modules/subjects/pages/SubjectsPage';
import SubjectDetailPage from './modules/topics/pages/SubjectDetailPage';
import TopicCardsPage from './modules/cards/pages/TopicCardsPage';
import StudyPage from './modules/study/pages/StudyPage';
import LoginPage from './modules/auth/pages/LoginPage';
import RegisterPage from './modules/auth/pages/RegisterPage';
import ProfilePage from './modules/auth/pages/ProfilePage';
import SettingsPage from './modules/auth/pages/SettingsPage';
import FlowsListPage from './modules/flows/pages/FlowsListPage';
import FlowEditorPage from './modules/flows/pages/FlowEditorPage';
import PdfLibraryPage from './modules/pdf-library/pages/PdfLibraryPage';
import ChatPage from './modules/chat/pages/ChatPage';
import CardLevelsCadastroPage from './modules/cadastros/pages/CardLevelsCadastroPage';
import ColorsCadastroPage from './modules/cadastros/pages/ColorsCadastroPage';
import CardTagsCadastroPage from './modules/cadastros/pages/CardTagsCadastroPage';
import EcosystemTreePage from './modules/topics/pages/EcosystemTreePage';
import { AuthProvider, useAuth } from './modules/auth/context/AuthContext';
import { SessionExpiredAlert } from './modules/auth/components/SessionExpiredAlert';
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
      <div className="sc-auth-loading">
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Switch (não IonRouterOutlet): o outlet do Ionic cacheia páginas por padrão
  // e ao trocar /subjects/:id ou /topics/:id às vezes mostra o grupo/pasta anterior.
  return (
    <AppShell>
      <div className="sc-router-root">
        <Switch>
          <Route exact path="/home" component={SubjectsPage} />
          <Route exact path="/arvore" component={EcosystemTreePage} />
          <Route exact path="/subjects/:subjectId" component={SubjectDetailPage} />
          <Route exact path="/topics/:topicId" component={TopicCardsPage} />
          <Route exact path="/flows" component={FlowsListPage} />
          <Route path="/flows/:flowId" component={FlowEditorPage} />
          <Route exact path="/library" component={PdfLibraryPage} />
          <Route exact path="/chat" component={ChatPage} />
          <Route exact path="/study/:topicId" component={StudyPage} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/settings" component={SettingsPage} />
          <Route exact path="/cadastros/niveis" component={CardLevelsCadastroPage} />
          <Route exact path="/cadastros/cores" component={ColorsCadastroPage} />
          <Route exact path="/cadastros/tags" component={CardTagsCadastroPage} />
          <Route exact path="/cadastros">
            <Redirect to="/cadastros/niveis" />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </Switch>
      </div>
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
          <SessionExpiredAlert />
        </IonReactRouter>
      </AuthProvider>
    </ThemeProvider>
  </IonApp>
);

export default App;
