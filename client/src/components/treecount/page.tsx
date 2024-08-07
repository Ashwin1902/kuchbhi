import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

interface Prediction {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [treeCount, setTreeCount] = useState<number>(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      setPredictions(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const distance = (point1: [number, number], point2: [number, number]) => {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2)
    );
  };

  const clusterPredictions = (predictions: Prediction[]) => {
    const points = predictions.map((pred) => [
      (pred.xmin + pred.xmax) / 2,
      (pred.ymin + pred.ymax) / 2,
    ] as [number, number]);

    const clusters: [number, number][][] = [];
    const threshold = 50; // Adjust this threshold as needed

    points.forEach((point, index) => {
      let addedToCluster = false;
      for (let cluster of clusters) {
        for (let clusterPoint of cluster) {
          if (distance(point, clusterPoint) < threshold) {
            cluster.push(point);
            addedToCluster = true;
            break;
          }
        }
        if (addedToCluster) break;
      }
      if (!addedToCluster) {
        clusters.push([point]);
      }
    });

    return clusters.length;
  };

  useEffect(() => {
    if (imageUrl && predictions.length > 0) {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            predictions.forEach((prediction) => {
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 5;
              ctx.strokeRect(
                prediction.xmin,
                prediction.ymin,
                prediction.xmax - prediction.xmin,
                prediction.ymax - prediction.ymin
              );
            });

            const uniqueTreeCount = clusterPredictions(predictions);
            setTreeCount(uniqueTreeCount);
          }
        }
      };
    }
  }, [imageUrl, predictions]);

  return (
    <div>
      <div className='flex flex-col justify-center items-center space-y-4'>
        <h1 className='font-semibold text-center text-3xl '>Tree Detection</h1>
        <input
          placeholder=''
          type="file"
          accept="image/*"
          className="mb-4 border-2 px-2 py-1 rounded-xl"
          onChange={handleImageChange}
        />
        <Button
          onClick={handleUpload}
          disabled={!file}
          className='py-2 px-6 rounded-lg w-fit text-xl text-black'
          variant={'outline'}
        >
          Process Image
        </Button>
      </div>

      <div className='flex gap-2  jusfity-center w-full'>
        {imageUrl && (
          <div className='w-[50%]'>
            <h2 className='font-semibold text-xl'>Selected Image:</h2>
            <img src={imageUrl} alt="Selected" className='border-2 shadow-md border-spacing-2 w-[90%]' />
          </div>
        )}
        {predictions.length > 0 && (
          <div className='w-[50%]'>
            <h2 className='font-semibold text-xl'>Processed Image:</h2>
            <canvas id="canvas" className='w-[90%]' />
          </div>
        )}
      </div>
      {treeCount > 0 && (
        <div className='flex justify-center items-center text-center my-3 w-full'>
          <h2 className='font-semibold text-3xl'>Number of Unique Trees: {treeCount}</h2>
        </div>
      )}
    </div>
  );
}
