type Props = {
  status: string
}

export default function StatusBadge({status}:Props){

  const colors:any = {
    published:"bg-green-100 text-green-700",
    draft:"bg-yellow-100 text-yellow-700",
    rejected:"bg-red-100 text-red-700"
  }

  return (

    <span className={`px-2 py-1 text-xs rounded ${colors[status]}`}>
      {status}
    </span>

  )

}