import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/search">Search</Link>
      {user ? (
        <>
          <Link to="/library">My Library</Link>
          <Link to={`/profile/${user.id}`}>Profile</Link>
          <Link to="/settings">Settings</Link>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  )
}
