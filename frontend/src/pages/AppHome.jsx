import { useEffect, useState } from 'react'
import { getRooms } from '../services/api'
import { useAuth } from '../auth/AuthContext'

function AppHome() {
  const { user, accessToken } = useAuth()

  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await getRooms(accessToken)
        setRooms(data.results ?? data)
      } catch (err) {
        setError(err.message)
      }
    }

    if (accessToken) {
      loadRooms()
    }
  }, [accessToken])

  return (
    <main>
      <h1>StudyGram</h1>

      <p>Logged in as: {user.username}</p>

      <h2>Rooms</h2>

      {error && <p>{error}</p>}

      {rooms.map((room) => (
        <div key={room.id}>
          {room.name}
        </div>
      ))}
    </main>
  )
}

export default AppHome