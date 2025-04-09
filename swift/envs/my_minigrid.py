import gym
from minigrid.core.grid import Grid
from minigrid.core.world_object import Goal, Wall, Key, Door, Floor, Lava
from minigrid.minigrid_env import MiniGridEnv
from minigrid.core.mission import MissionSpace
import random
from PIL import Image


class MiniAgent(object):
    def __init__(self, pos, dir):
        self.pos = pos
        self.dir = dir

    def can_overlap(self):
        return False


class ProgressiveGridEnv(MiniGridEnv):
    def __init__(self, complexity_level=1):
        self.complexity_level = complexity_level
        self.env_id = f"MiniGrid-Progressive-{complexity_level}-v0"
        grid_size = 12  # min(6 + complexity_level, 12)

        # Define the mission space, for example, as a simple string space
        mission_space = MissionSpace(
            mission_func=lambda: f"Reach the green goal square.",
        )

        super().__init__(
            grid_size=grid_size,
            max_steps=4 * grid_size**2,
            see_through_walls=False,
            mission_space=mission_space,
        )

    def _gen_grid(self, width, height):
        self.grid = Grid(width, height)
        self.grid.wall_rect(0, 0, width, height)

        # Place goal in a random position
        self.put_obj(
            Goal(),
            10,
            10,  # random.randint(0, width - 1), random.randint(0, height - 1)
        )

        # Level-based feature addition
        if self.complexity_level >= 1:
            # Level 1+: neutral obstacles
            self._add_neutral_obstacles()

        if self.complexity_level >= 2:
            # Level 2+: lava cells
            self._add_lava_cells(num=self.complexity_level)

        if self.complexity_level >= 3:
            # Level 3+: keys and locked doors
            self._add_key_door_pairs(num=max(1, self.complexity_level // 2))

        if self.complexity_level >= 5:
            # Level 5+: ice (slippery cells)
            self._add_ice_cells(num=max(2, self.complexity_level))

        if self.complexity_level >= 6:
            # Level 6+: hidden traps (near ice or lava)
            self._add_hidden_traps(num=max(1, self.complexity_level // 2))

        self.mission = "Reach the green goal square."

        # Place agent
        self.place_agent()

    def place_agent(self):
        self.agent_pos = (1, 1)
        self.agent_dir = 0

    def place_obj(self, obj, pos=None, reject_fn=None):
        if pos is None:
            pos_valid = False
            while not pos_valid:
                pos = (
                    random.randint(1, self.grid.width - 2),
                    random.randint(1, self.grid.height - 2),
                )
                if self.grid.get(pos[0], pos[1]) is None and pos != self.agent_pos:
                    if reject_fn is None or not reject_fn(self, pos):
                        pos_valid = True
        self.grid.set(pos[0], pos[1], obj)
        return pos

    def _add_neutral_obstacles(self):
        for _ in range(self.complexity_level + 2):
            self.place_obj(Wall())

    def _add_lava_cells(self, num):
        for _ in range(num):
            self.place_obj(Lava())

    def _add_key_door_pairs(self, num):
        colors = ["yellow", "blue", "red", "green"]
        for i in range(num):
            color = colors[i % len(colors)]
            key_pos = self.place_obj(Key(color))
            door_pos = self.place_obj(Door(color, is_locked=True))
            # Ensure door-key order for temporal complexity
            self._ensure_path_order(key_pos, door_pos)

    def _add_ice_cells(self, num):
        for _ in range(num):
            pos = self.place_obj(Floor("blue"))

    def _add_hidden_traps(self, num):
        added = 0
        attempts = 0
        while added < num and attempts < 100:
            pos = self.place_obj(
                Floor("red"),
                reject_fn=lambda env, pos: not env._near_feature(pos, ["blue", "lava"]),
            )
            added += 1
            attempts += 1

    def _near_feature(self, pos, features):
        x, y = pos
        for nx, ny in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]:
            if 0 <= nx < self.grid.width and 0 <= ny < self.grid.height:
                cell = self.grid.get(nx, ny)
                if cell and (
                    (isinstance(cell, Floor) and cell.color in features)
                    or (isinstance(cell, Lava) and "lava" in features)
                ):
                    return True
        return False

    def _ensure_path_order(self, key_pos, door_pos):
        # heuristic to position key closer to agent and door closer to goal
        pass  # Implement specific path order logic if needed

    def render(
        self,
        mode="human",
        save_path="/mnt/lustre/work/wu/wkn601/absexpl_data/swift_logs/env_{}.png",
    ):
        if mode == "text":
            # Text-based rendering
            symbols = {
                "agent": "S",
                "goal": "R",
                "wall": "X",
                "lava": "L",
                "empty": " ",
                "key": "K",
                "door": "D",
                "ice": "I",
                "trap": "T",
            }
            grid_str = ""
            for y in range(self.grid.height):
                for x in range(self.grid.width):
                    cell = self.grid.get(x, y)
                    if x == self.agent_pos[0] and y == self.agent_pos[1]:
                        grid_str += f"{symbols['agent']}"
                    elif cell is None:
                        grid_str += f"{symbols['empty']}"
                    elif isinstance(cell, Goal):
                        grid_str += f"{symbols['goal']}"
                    elif isinstance(cell, Wall):
                        grid_str += f"{symbols['wall']}"
                    elif isinstance(cell, Lava):
                        grid_str += f"{symbols['lava']}"
                    elif isinstance(cell, Key):
                        grid_str += f"{symbols['key']}"
                    elif isinstance(cell, Door):
                        grid_str += f"{symbols['door']}"
                    elif isinstance(cell, Floor) and cell.color == "blue":
                        grid_str += f"{symbols['ice']}"
                    elif isinstance(cell, Floor) and cell.color == "red":
                        grid_str += f"{symbols['trap']}"
                    else:
                        grid_str += f"[{symbols['empty']}]"
                grid_str += "\n"
            print(grid_str)
            return grid_str
        elif mode == "human":
            # Image-based rendering using the existing method
            img_array = self.grid.render(
                tile_size=16, agent_pos=self.agent_pos, agent_dir=self.agent_dir
            )

            # Convert the NumPy array to a PIL Image
            img = Image.fromarray(img_array)

            if save_path:
                img.save(save_path.format(self.complexity_level))

            return img


if __name__ == "__main__":
    # Simple test for ProgressiveGridEnv
    def test_progressive_grid_env():
        print("Testing ProgressiveGridEnv...")
        for level in range(6, 7):
            print(f"Testing complexity level: {level}")
            env = ProgressiveGridEnv(complexity_level=level)
            env.reset()
            print(f"Grid size: {env.grid.width}x{env.grid.height}")

            # Visualize the environment
            env.render("text")
            env.render("human")

    test_progressive_grid_env()
