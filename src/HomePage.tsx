import { FunctionComponent } from "react";
import LoginButton from "./LoginButton";
// import { getGitHubAccessToken } from "./App";

type Props = {
  // none
};

const HomePage: FunctionComponent<Props> = () => {
  return (
    <div>
      <h3>Log in using GitHub in order to use Neurosift Saved Chats</h3>
      <LoginButton />
    </div>
  )
};

export default HomePage;
