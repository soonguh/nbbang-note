import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Groups from './pages/Groups.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* 로그인한 사용자만 접근 가능한 화면 */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/groups" replace />} />
    </Routes>
  );
}
