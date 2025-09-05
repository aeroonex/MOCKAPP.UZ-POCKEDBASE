import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-foreground">
      <div className="text-center p-6 bg-card rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4">Cefr LC Speaking Platform</h1>
        <p className="text-xl text-muted-foreground mb-6">
          CEFR speaking imtihonlaringizga mock testlar va savollarni boshqarish orqali tayyorlaning.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/mock-test">
            <Button size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
              Start Mock Test
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 w-full sm:w-auto">
              Login to Platform
            </Button>
          </Link>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;