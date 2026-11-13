import { UserRound } from 'lucide-react'

function ProfileAvatar({ photo, username, className = '' }) {
  return (
    <span
      aria-label={photo
        ? `Fotografía de ${username}`
        : username ? `Avatar predeterminado de ${username}` : 'Avatar predeterminado'}
      className={`profile-avatar-image ${className}`.trim()}
      role="img"
    >
      {photo ? <img alt="" src={photo} /> : <UserRound aria-hidden="true" size={21} />}
    </span>
  )
}

export default ProfileAvatar
