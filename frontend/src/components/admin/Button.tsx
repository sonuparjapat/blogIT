type Props={
 children:React.ReactNode
 onClick?:()=>void
 variant?:"primary"|"danger"
}

export default function Button({
 children,
 onClick,
 variant="primary"
}:Props){

 const styles={
  primary:"bg-blue-600 text-white",
  danger:"bg-red-600 text-white"
 }

 return(

  <button
   onClick={onClick}
   className={`px-3 py-1 rounded text-sm ${styles[variant]}`}
  >
   {children}
  </button>

 )

}