import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom"; // Import Link
import { Button } from "@/components/ui/button"; // Import Button

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-foreground">
      <div className="text-center p-6 bg-card rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Start building your amazing project here!
        </p>
        <Link to="/mood-journal">
          <Button size="lg" className="text-lg px-8 py-4">
            Go to Mood Journal
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;