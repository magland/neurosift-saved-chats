import './App.css'
import { BrowserRouter } from 'react-router-dom'
import HomePage from './HomePage'
import LogInPage from './LogInPage'
import useRoute from './useRoute'
// import useRoute from './useRoute'

function App() {
  return (
    <BrowserRouter>
      <MainWindow />
    </BrowserRouter>
  )
}

function MainWindow() {
  const { route } = useRoute()
  if (route.page === 'home') {
    return <HomePage />
  }
  else if (route.page === 'logIn') {
    return <LogInPage />
  }
  else {
    return <div>Invalid route</div>
  }
}

export default App
