import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Header = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-between w-full px-2 sm:px-4 flex-1 gap-1 sm:gap-2">
            <div
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity gap-1 sm:gap-2 flex-shrink min-w-0"
                onClick={() => navigate("/")}
            >
                <img
                    src="/logo.png"
                    alt="Interview Vault Logo"
                    className="h-16 w-16 sm:h-32 sm:w-32 md:h-40 md:w-40 object-contain flex-shrink-0"
                />
                <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg shadow-lg sm:whitespace-nowrap max-w-[120px] sm:max-w-none text-center leading-tight">
                    {t("Interview Vault")}
                </h1>
            </div>

            {user && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 border-blue-700 text-white hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                    >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t(user?.user_metadata?.full_name || user?.email || 'Dheeraj Kumar')}</span>
                        <span className="sm:hidden ml-1">{t('Dheeraj Kumar')}</span>
                    </Button>
                    <Button
                        onClick={signOut}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 border-blue-700 text-white hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                    >
                        <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t("Sign Out")}</span>
                        <span className="sm:hidden ml-1">{t("Sign Out")}</span>
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Header;
