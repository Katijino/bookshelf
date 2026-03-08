import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import BookPage from './pages/BookPage'
import AuthorPage from './pages/AuthorPage'
import Library from './pages/Library'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Challenges from './pages/Challenges'
import Groups from './pages/Groups'
import Settings from './pages/Settings'
import Login from './pages/Login'

function App() {
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [setSession])

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                  element={<Home />} />
        <Route path="/book/:id"          element={<BookPage />} />
        <Route path="/author/:id"        element={<AuthorPage />} />
        <Route path="/library"           element={<Library />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/search"            element={<Search />} />
        <Route path="/challenges"        element={<Challenges />} />
        <Route path="/groups"            element={<Groups />} />
        <Route path="/settings"          element={<Settings />} />
        <Route path="/login"             element={<Login />} />
      </Routes>
    </>
  )
}

export default App
