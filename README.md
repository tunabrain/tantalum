![Tantalum Sample Render](https://raw.githubusercontent.com/tunabrain/tantalum/master/Header.jpg "Tantalum Sample Render")

# The Tantalum Renderer #

## About ##

Tantalum is a physically based 2D renderer written out of personal interest. The idea of this project was to build a light transport simulation using the same mathematical tools used in academic and movie production renderers, but in a simplified 2D setting. The 2D setting allows for faster render times and a more accessible way of understanding and interacting with light, even for people with no prior knowledge or interest in rendering.

Tantalum is written in JavaScript and WebGL.

## License ##

To give developers as much freedom as is reasonable, Tantalum is distributed under the [libpng/zlib](http://opensource.org/licenses/Zlib) license. This allows you to modify, redistribute and sell all or parts of the code without attribution.

Note that Tantalum includes several third-party libraries in the `src/thirdparty` folder that come with their own licenses. Please see the `LICENSE.txt` file for more information.

## Compilation ##

The only thing that needs to be compiled are the shaders, contained in the `shaders` subfolder. The `compile_shaders.py` script will turn those text files into a list of strings in a JS file (needs Python 3).
