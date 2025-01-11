# Standard Electric Game Design Document

# Overview

## **Game Concept**

**Standard Electric** is a competitive, multiplayer strategy game where players build and manage power plants and grids, vying to become the leading electric company. Real-world-inspired mechanics like power plant technologies, fuel supply, transmission lines, and carbon emissions create a dynamic, educational, and engaging gameplay experience.

- **Players**: 2 - 8
- **Play time**: ~30min

## **Core Goals**

- Encourage learning about energy systems, carbon emissions, and trade-offs.
- Provide strategic competition through resource management and grid optimization.
- Progressive complexity: new mechanics are added as the game progresses.
- Friendly to casual players: games last 30 minutes or less.

## **Target Audience**

- Strategy game enthusiasts who enjoy resource management or city builders (e.g., *Power Grid*, *Cities: Skylines*).
- Board game players seeking a fun online experience with friends.
- Players interested in energy and climate topics looking for a pseudo-educational experience.

# Gameplay Mechanics

## Player Goal

The first player to reach a preset goal of total energy delivered wins. Players can receive secondary awards for total clean energy generated, total revenue, successfully lobbying attempts, least carbon dioxide emitted, and more.

## Map and Grid Management

- A hex-based map represents the game world, with town/city hexes as demand centers and empty/resource hexes for placing power plants.
- Players build transmission and distribution lines on hex corners to connect power plants to demand centers.
- Players must compete for map placement: each hex tile can only be occupied by one object. Power poles can be stacked, but building a power pole on top of an existing one costs twice as much.
- Distribution poles can only be connected to directly adjacent poles.
- Transmission poles can be connected to distant poles, but operate at a higher voltage, and must be connected to power plants and distribution lines via transformers.
- Poles can only be built adjacent to a player's power plant, or to a grid that the player has a plant connected to.

## Cycles and Ticks

- The game progresses real-time in **cycles**, each representing a day/night sequence to simulate energy production and demand variability.
    - **Day phase:** Solar plants generate energy. Demand peaks in the evening, before nightfall (gameplay takes place during summer months).
    - **Night phase:** Solar plants become idle, requiring other sources to maintain supply. Demand is generally lower.
- Each cycle is divided into several ticks. Game events happen on ticks.
- **Construction and Maintenance:**
    - Building power plants or infrastructure takes multiple cycles to complete.
    - Maintenance tasks must be performed periodically to prevent breakdowns, adding strategic timing considerations.
- **Weather Events:** Weather patterns may vary per cycle (e.g., cloud cover or storms) and may disrupt or enhance power generation for specific types of plants.

## Power Plants

- Players acquire power plant blueprints through dynamic, timed auctions. An auction begins with the first bid, and subsequent bids extend the countdown timer, creating a competitive environment until a winner is declared.
- Power plants vary in type, cost, and environmental impact:
    - **Coal Plants:** Reliable and consistent but produce high carbon emissions, leading to penalties.
    - **Natural Gas Plants:** Flexible output with moderate emissions, balancing cost and impact.
    - **Nuclear Plants:** High-capacity, low-emission plants that are costly and require uranium fuel.
    - **Solar Arrays:** Emission-free but dependent on daytime cycles and require storage for consistency.
    - **Wind Farms:** Emission-free but rely on variable wind speeds across the map.
    - **Hydro Plants:** Clean and consistent, but restricted to river placements.
- Initially, only a limited set of power plants is available. More power plant options become available for auction as the game progresses. Later game power plants are generally more expensive.
- Some power plants require fuel. Fuel is automatically purchased to run the plant as necessary. Fuel markets are dynamic, where prices depend on how many players are purchasing that fuel type.
- Power plants require maintenance on a regular basis. Power plants that have not been maintained for a while risk breaking down each cycle, which puts the power plant out of commission until fixed.
- Players can upgrade certain plants to improve fuel efficiency, capacity, or maintainability.

## Supply, Demand, and Pricing

- Players earn revenue based on electricity sold during each tick.
- Towns have fluctuating demand within each cycle. The demand from a town depends on its population. Town populations grow over time and spread to adjacent tiles if their power needs are fully met.
- Players can set a bid price per power plant. Higher prices lead to less consumption and slower population growth. Lower prices lead to less revenue. By default, a plant's bid price is set to be optimal for consumption.
- Pricing follows a deregulated competitive bidding system. If multiple plants are connected to the same grid, the lowest priced power will take priority until demand needs are met. The most expensive supplier needed to satisfy demand sets the market clearing price, which is paid out to all suppliers.
- **Example:** If Player A offers power at $10/unit and Player B offers power at $15/unit, Player A’s electricity will be used first. If demand requires Player B’s electricity, all suppliers on the grid are paid $15/unit, incentivizing competitive pricing and strategic placement of power plants.

## Environmental Impact

- Certain types of power plants emit carbon dioxide and pollution.
- Pollution causes nearby cities to decline in population. This incentivizes players to build power plants reasonably far from cities, or to build renewable energy sources.
- Carbon dioxide is stored in the atmosphere, and causes global temperatures to rise, which can cause random extreme weather events that destroy player infrastructure and cities.
- Solar arrays and other renewables generate no direct emissions or pollution.

## Policies

- Policies are randomly proposed during the game, introducing dynamic changes that impact all players and can affect city growth, power plant revenue, or fuel prices. This adds a system of variable rewards and multiplicative combos to the gameplay.
- **Examples of Policies:**
    - "Green Energy Subsidy": Increases revenue for renewable energy plants and reduces revenue for fossil fuel plants. This policy becomes more likely if CO2 levels are high.
    - "Carbon Tax": Applies a penalty to high-emission power plants, encouraging players to shift to cleaner energy sources. This policy becomes more likely if CO2 levels are high.
    - "Infrastructure Expansion Grant": Reduces the cost of building new transmission lines, speeding up grid growth.
    - "Fuel Price Regulation": Temporarily fixes fuel prices, stabilizing costs but limiting market dynamics.
- Players can influence policy outcomes by lobbying. Lobbying involves spending money to increase the likelihood of a policy being accepted or rejected, depending on the player's preference. The more money a player spends on lobbying, the higher their influence over the policy outcome.

## Competitive and Multiplayer Features

- **Auctions**: Players compete to bid for unique power plants.
- **Policies:** Players compete to lobby for policies that can benefit or harm them.
- **Market Competition:** Players can undercut each other's prices to supply cities with power.
- **Territorial Competition**: Race to claim high-value hexes and resource sites.
- **Transmission Fees:** Charge other players for using your grid infrastructure.

# Visual Design

## Visual Inspiration

**Standard Electric** aims to have a sleek, minimal visual style, feeling like a cross between a high-end SASS product and a futuristic game. Think clean lines, bloom effects, glowing charts with gradients, minimalistic 3D shapes and buildings.

- AI-generated vibes
    
    ![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/e2c57b19-fefe-4e31-94f8-bb47ed270b9b/image.png)
    
    ![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/0addd300-d16a-4ee6-899f-77b301237a01/image.png)
    
    ![20250101_1829_Futuristic Data Display_simple_compose_01jgjdhcdwevrbchsr925cjfrw.gif](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/e3ff0cae-c054-4312-8ee7-4ae1b9069608/20250101_1829_Futuristic_Data_Display_simple_compose_01jgjdhcdwevrbchsr925cjfrw.gif)
    
    ![DALL·E 2025-01-01 18.31.16 - A futuristic web-based game interface for a project called 'Standard Electric.' The design is sleek and minimalistic, combining elements of a high-end.webp](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/23340a9c-1818-4333-a8bc-3f737d8148e6/DALLE_2025-01-01_18.31.16_-_A_futuristic_web-based_game_interface_for_a_project_called_Standard_Electric._The_design_is_sleek_and_minimalistic_combining_elements_of_a_high-end.webp)
    
- Dribbble shot vibes
    
    ![https://dribbble.com/shots/23726173-3D-Landscape-Elevation-Map-Backgrounds - Contoured maps and gradients](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/91c80611-c70c-474b-b0ac-521bb55c57c8/image.png)
    
    https://dribbble.com/shots/23726173-3D-Landscape-Elevation-Map-Backgrounds - Contoured maps and gradients
    
    ![https://dribbble.com/shots/9458738-Contours - Glowing lines and contours](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/e366bb12-cd27-4192-b777-bffdebede086/image.png)
    
    https://dribbble.com/shots/9458738-Contours - Glowing lines and contours
    
    ![https://dribbble.com/shots/22034144-Travel-App-Tracking-Hiking-Dashboard-Trip-Creating-Soft - Gradient-backed charts and contoured map, icon indicators on map](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/fdfd4b2f-63a8-402f-9b74-1208e3c1bb0c/image.png)
    
    https://dribbble.com/shots/22034144-Travel-App-Tracking-Hiking-Dashboard-Trip-Creating-Soft - Gradient-backed charts and contoured map, icon indicators on map
    
    ![https://dribbble.com/shots/14966272-Mini-City-for-Blender - Simplistic, minimalistic buildings](https://prod-files-secure.s3.us-west-2.amazonaws.com/59f0d296-c88a-47fc-a2de-9a39fade767e/ed94b61c-e0ca-4690-bf41-2045f15fc083/image.png)
    
    https://dribbble.com/shots/14966272-Mini-City-for-Blender - Simplistic, minimalistic buildings
    

## **Interface**

- A hex map with intuitive icons for towns, power plants, and resources.
- Interactive tooltips display detailed information about hexes, structures, and production.
- Dashboards summarize revenue, costs, emissions, and cycle progress.

## **Onboarding**

- A concise, step-by-step tutorial introduces essential mechanics: placing plants, building transmission lines, and managing supply/demand.
- Advanced tutorials guide players through complex features like auctions, alliances, and specialized plant management.

# Technical Specifications

## **Front-End**

- Developed as a web-based application using React, three.js, and TypeScript.
- Game state is stored in an XState machine
- Initial deployment targeted for desktop (with Electron for Steam compatibility); mobile responsiveness considered for future updates.

## Server

- Game rooms are created via actor-kit, based on Cloudflare workers and durable objects
- Next.js serves the app routes and static content

# **Next Steps**

1. Develop a minimal prototype featuring:
    - Basic power plants (Gas and Solar) and a bidding system.
    - Population centers and basic distribution and pricing mechanics.
2. Conduct gameplay testing in short sessions, gathering feedback from players.
3. Expand the game with advanced features, balancing complexity with accessibility.
4. Iterate on user experience based on feedback to refine competitive and multiplayer mechanics.

# **Final Note**

**Standard Electric** aims to combine strategic depth, educational value, and multiplayer engagement into a cohesive and entertaining experience. This document will serve as a foundation for iterative development and expansion.