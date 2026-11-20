import './Home.css'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

const queryPi = () => {
  console.log('Querying Pi...')
  const output = document.getElementById("pioutput");
  fetch("http://127.0.0.1:3000/pi/ask")
    .then((response) => response.text())
    .then((response) => {
      output.value = response;
    })
    .catch((error) => console.error(error));
}

const healPi = () => {
  console.log('Healing Pi...')
}

function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen m-8">
      <span className="text-2xl font-bold pb-4">Self Healing Windows</span>
      
      <ButtonGroup>
        <Button onClick={queryPi}>Query</Button>
        <Button onClick={healPi}>Heal</Button>
      </ButtonGroup>

      <textarea 
        className="w-full h-96 mt-4 bg-gray-600 border border-black rounded-lg text-white text-sm font-sans p-2" 
        readOnly 
        placeholder="Output will appear here..."
        id="pioutput"
      />
    </div>
  )
}

export default Home
