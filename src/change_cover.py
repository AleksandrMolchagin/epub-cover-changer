import sys
import zipfile
import os
import shutil
import xml.etree.ElementTree as ET

OPF_NAMESPACE = {
    'opf': 'http://www.idpf.org/2007/opf'
}

def find_cover_in_opf(temp_dir):
    # Search for content.opf
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            if file == 'content.opf':
                opf_path = os.path.join(root, file)

                # Parse content.opf to find the cover image
                tree = ET.parse(opf_path)
                root = tree.getroot()

                # Retrieve cover item from the manifest
                cover_item = root.find(".//opf:item[@properties='cover-image']", OPF_NAMESPACE)
                if cover_item is not None:
                    return os.path.join(os.path.dirname(opf_path), cover_item.get('href'))

    return None

def replace_cover(epub_file, cover_image):
    # Extract EPUB contents to a temporary directory
    temp_dir = "temp_epub"
    with zipfile.ZipFile(epub_file, 'r') as z:
        z.extractall(temp_dir)

    cover_path = find_cover_in_opf(temp_dir)
    if not cover_path:
        print("Could not find cover in EPUB.")
        return

    os.replace(cover_image, cover_path)

    # Zip contents back into EPUB
    with zipfile.ZipFile(epub_file, 'w') as z:
        for root, _, files in os.walk(temp_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = file_path[len(temp_dir) + 1:]
                z.write(file_path, arcname)

    # Clean up temporary directory
    shutil.rmtree(temp_dir)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 change_cover.py <epub_file> <cover_image>")
        sys.exit(1)

    epub_file = sys.argv[1]
    cover_image = sys.argv[2]

    replace_cover(epub_file, cover_image)
    print("Cover replaced successfully!")
