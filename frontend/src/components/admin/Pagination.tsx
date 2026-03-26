"use client"

type Props = {
  page: number
  totalPages: number
  onChange: (page:number)=>void
}

export default function Pagination({
  page,
  totalPages,
  onChange
}: Props) {

  return (

    <div className="flex gap-2 mt-6">

      <button
        disabled={page===1}
        onClick={()=>onChange(page-1)}
        className="px-3 py-1 border rounded"
      >
        Prev
      </button>

      <span className="px-3 py-1">
        {page} / {totalPages}
      </span>

      <button
        disabled={page===totalPages}
        onClick={()=>onChange(page+1)}
        className="px-3 py-1 border rounded"
      >
        Next
      </button>

    </div>

  )

}