import { HiArrowRightOnRectangle } from "react-icons/hi2";
import useLogout from "./useLogout";
import Loading from "../../ui/Loading";
import Button from "@/components/Button";

function Logout() {
  const { isPending, logout } = useLogout();

  return isPending ? (
    <Loading />
  ) : (
    <Button onClick={logout}>
      <HiArrowRightOnRectangle className="w-5 h-5 text-secondary-500 hover:text-error" />
    </Button>
  );
}
export default Logout;
