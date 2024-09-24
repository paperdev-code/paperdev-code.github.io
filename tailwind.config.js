const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ["src/index.html"],
  theme: {
    screens: {
      desktop: "680px"
    },
    extend: {
      spacing: {
        dth: "640px",
        dtv: "480px",
      },
      colors: {
        decoration: "#1e1f22",
        stdout: "#2b2d30",
        stdoutfg: "#cdd6f4",
        maximize: "#a0a2aa",
        minimize: "#a0a2aa",
        close: "#e11e28",
        zig: "#f0a923",
        cpp: "#7d7949",
        go: "#86d1fd",
        rust: "#dd3d1d",
        nu: "#44a775",
        htmx: "#4e69d7",
        mcu: "#2d644b",
        nix: "#5c71c3",
        user: "#bf616a",
      },

      fontFamily: {
        "mono": ["FantasqueSansMonoRegular", "consolas"],
      }
    }
  },
  plugins: [
    plugin(function({matchUtilities, theme}) {
      matchUtilities(
        {
          "decoration": (color) => ({
            "border-radius": "100%",
            "width": "1rem",
            "height": "1rem",
            "margin-top": "0.25rem",
            "background-color": color,
            "margin-left": "0.1rem",
            "margin-right": "0.1rem",
          }),
          "skill": (color) => ({
            "background-color": color,
            "display": "inline-block",
            "width": "4rem",
            "text-align": "center",
            "border-radius": "0.25rem",
            "margin": "2px 0px 2px 0px",
            "padding": "0.125rem",
            "color": theme("colors").stdout,
            "font-weight": "700",
          }),
        },
        { values: theme("colors") }
      )
    })
  ],
}
