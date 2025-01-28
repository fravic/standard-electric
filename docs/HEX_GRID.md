### How the hex grid works

The game uses a pointy-top hexagonal grid with odd-r offset coordinates, where:
Moving NE from (x,z) goes to (x,z-1)
Moving SE from (x,z) goes to (x,z+1)
Moving E from (x,z) goes to (x+1,z)

Each corner in the hex grid has a single coordinate: an (x,z) coordinate plus either North or South, indicating whether it is at the top or bottom of that (x,z) hex cell.
