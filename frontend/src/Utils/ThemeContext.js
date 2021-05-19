import React, {useContext,useState} from 'react'

const ThemeContext= React.createContext()
const ThemeUpdateContext=React.createContext()


export function  useThemeContent(){
    return useContext(ThemeContext)
}
export function useThemeUpdate(){
    return useContext(ThemeUpdateContext)
}

export function ThemeProvider({children}){
    const [darkTheme, setDarkTheme] = useState(true)

    function toggleTheme(){
        setDarkTheme(prevMode=>!prevMode)
    }


    return(
        <ThemeContext.Provider value={darkTheme}>
            <ThemeUpdateContext.Provider value={toggleTheme}>

                {children}

            </ThemeUpdateContext.Provider>
        </ThemeContext.Provider>
    )
}
export default ThemeContext 