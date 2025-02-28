import { AlertTriangle } from "lucide-react"

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="mb-4 bg-red-900 text-red-100 p-3 rounded-md flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <p>{message}</p>
    </div>
)

export default ErrorMessage
