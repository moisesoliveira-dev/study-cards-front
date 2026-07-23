import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import SubjectsPage from './modules/subjects/pages/SubjectsPage';
import SubjectDetailPage from './modules/topics/pages/SubjectDetailPage';
import TopicCardsPage from './modules/cards/pages/TopicCardsPage';
import StudyPage from './modules/study/pages/StudyPage';
import LoginPage from './modules/auth/pages/LoginPage';
import RegisterPage from './modules/auth/pages/RegisterPage';
import FlowsListPage from './modules/flows/pages/FlowsListPage';
import FlowEditorPage from './modules/flows/pages/FlowEditorPage';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { PrivateRoute } from './core/auth/PrivateRoute';
import { ThemeProvider } from './shared/theme/ThemeContext';

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

const App: React.FC = () => (
  <IonApp>
    <ThemeProvider>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/register" component={RegisterPage} />
          <PrivateRoute exact path="/home" component={SubjectsPage} />
          <PrivateRoute
            exact
            path="/subjects/:subjectId"
            component={SubjectDetailPage}
          />
          <PrivateRoute
            exact
            path="/topics/:topicId"
            component={TopicCardsPage}
          />
          <PrivateRoute exact path="/flows" component={FlowsListPage} />
          <PrivateRoute exact path="/flows/:flowId" component={FlowEditorPage} />
          <PrivateRoute exact path="/study/:topicId" component={StudyPage} />
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
        </IonReactRouter>
      </AuthProvider>
    </ThemeProvider>
  </IonApp>
);

export default App;
