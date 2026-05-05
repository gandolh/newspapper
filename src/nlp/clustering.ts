import { embeddingGenerator } from './embeddings.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import type { EntityStorage } from '../storage/entities.js';

interface Article {
  id: string;
  title: string;
  body: string;
  [key: string]: unknown;
}

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface Cluster {
  articles: Article[];
  articleIds: string[];
  indices: number[];
  centroid?: number[] | null;
  threshold?: number;
  commonEntities?: EntitySet;
}

export class ArticleClusterer {
  async clusterArticles(articles: Article[], threshold: number | null = null): Promise<Cluster[]> {
    const similarityThreshold = threshold || config.clustering.defaultThreshold;

    logger.info(`Clustering ${articles.length} articles with threshold ${similarityThreshold}`);

    logger.step('Generating embeddings...');
    const embeddings = await Promise.all(
      articles.map(article => embeddingGenerator.generateArticleEmbedding(article))
    );

    logger.step('Computing similarity matrix...');
    const similarityMatrix = this.computeSimilarityMatrix(embeddings);

    logger.step('Forming clusters...');
    const clusters = this.formClusters(articles, embeddings, similarityMatrix, similarityThreshold);

    logger.success(`Created ${clusters.length} clusters`);
    return clusters;
  }

  computeSimilarityMatrix(embeddings: number[][]): number[][] {
    const n = embeddings.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0) as number[]);

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const similarity = embeddingGenerator.cosineSimilarity(embeddings[i], embeddings[j]);
          matrix[i][j] = similarity;
          matrix[j][i] = similarity;
        }
      }
    }

    return matrix;
  }

  formClusters(articles: Article[], embeddings: number[][], similarityMatrix: number[][], threshold: number): Cluster[] {
    const n = articles.length;
    const assigned = new Set<number>();
    const clusters: Cluster[] = [];

    for (let i = 0; i < n; i++) {
      if (assigned.has(i)) continue;

      const cluster: Cluster = {
        articles: [articles[i]],
        articleIds: [articles[i].id],
        indices: [i]
      };

      assigned.add(i);

      for (let j = i + 1; j < n; j++) {
        if (assigned.has(j)) continue;

        if (similarityMatrix[i][j] >= threshold) {
          cluster.articles.push(articles[j]);
          cluster.articleIds.push(articles[j].id);
          cluster.indices.push(j);
          assigned.add(j);
        }
      }

      if (cluster.articles.length >= config.clustering.minGroupSize) {
        const centroid = this.computeCentroid(cluster.indices.map(idx => embeddings[idx]));
        cluster.centroid = centroid;
        cluster.threshold = threshold;
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  computeCentroid(embeddings: number[][]): number[] | null {
    if (embeddings.length === 0) return null;

    const dim = embeddings[0].length;
    const centroid = new Array(dim).fill(0) as number[];

    for (const embedding of embeddings) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += embedding[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  async clusterByEntities(articles: Article[], entityStorage: EntityStorage): Promise<Cluster[]> {
    logger.info(`Clustering ${articles.length} articles by entities`);

    const clusters: Cluster[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < articles.length; i++) {
      if (assigned.has(articles[i].id)) continue;

      const entities1 = await entityStorage.load(articles[i].id);
      if (!entities1) continue;

      const cluster: Cluster = {
        articles: [articles[i]],
        articleIds: [articles[i].id],
        indices: [i],
        commonEntities: { ...entities1.entities }
      };

      assigned.add(articles[i].id);

      for (let j = i + 1; j < articles.length; j++) {
        if (assigned.has(articles[j].id)) continue;

        const entities2 = await entityStorage.load(articles[j].id);
        if (!entities2) continue;

        const overlap = this.computeEntityOverlap(entities1.entities, entities2.entities);

        if (overlap >= 0.3) {
          cluster.articles.push(articles[j]);
          cluster.articleIds.push(articles[j].id);
          assigned.add(articles[j].id);
          this.updateCommonEntities(cluster.commonEntities!, entities2.entities);
        }
      }

      if (cluster.articles.length >= config.clustering.minGroupSize) {
        clusters.push(cluster);
      }
    }

    logger.success(`Created ${clusters.length} entity-based clusters`);
    return clusters;
  }

  computeEntityOverlap(entities1: EntitySet, entities2: EntitySet): number {
    let totalEntities = 0;
    let commonEntities = 0;

    for (const type of ['people', 'places', 'organizations', 'events'] as const) {
      const set1 = new Set(entities1[type].map(e => e.toLowerCase()));
      const set2 = new Set(entities2[type].map(e => e.toLowerCase()));

      totalEntities += set1.size + set2.size;

      for (const entity of set1) {
        if (set2.has(entity)) {
          commonEntities += 2;
        }
      }
    }

    return totalEntities > 0 ? commonEntities / totalEntities : 0;
  }

  updateCommonEntities(common: EntitySet, newEntities: EntitySet): void {
    for (const type of ['people', 'places', 'organizations', 'events'] as const) {
      const newSet = new Set(newEntities[type].map(e => e.toLowerCase()));
      common[type] = common[type].filter(e => newSet.has(e.toLowerCase()));
    }
  }
}

export const articleClusterer = new ArticleClusterer();
